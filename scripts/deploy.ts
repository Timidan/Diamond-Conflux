/* global ethers */
/* eslint prefer-const: "off" */

import { ethers } from "hardhat";
import { FacetCutAction } from "./libraries/diamond";
import { Conflux } from "js-conflux-sdk";
import {
  getArtifacts,
  getAbi,
  getSelectors,
  testnet,
} from "./libraries/confluxDiamondHelpers";

export let DiamondAddress: string;

export async function deployDiamond() {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  //initialize conflux testnet instance
  const cfx = new Conflux({
    url: testnet,
    networkId: 1,
    logger: console,
  });

  //initialize wallet to send testnet transactions from
  const acct = cfx.wallet.addPrivateKey(process.env.CFX_PRIV ?? "");

  // deploy DiamondCutFacet
  const DiamondCut = cfx.Contract(getArtifacts("DiamondCutFacet"));
  const txReceipt = await DiamondCut.constructor()
    .sendTransaction({ from: acct })
    .executed();
  console.log(`DiamondCut Facet deployed to ${txReceipt.contractCreated}`);

  // deploy Diamond
  const Diamond = cfx.Contract(getArtifacts("Diamond"));
  const txReceipt2 = await Diamond.constructor(
    acct.toString(),
    txReceipt.contractCreated,
    "DiamondToken",
    "DMT"
  )
    .sendTransaction({ from: acct })
    .executed();
  console.log(`Diamond Proxy deployed to ${txReceipt2.contractCreated}`);
  DiamondAddress = txReceipt2.contractCreated;

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  // const DiamondInit = await ethers.getContractFactory("DiamondInit");
  // const diamondInit = await DiamondInit.deploy();
  // await diamondInit.deployed();
  // console.log("DiamondInit deployed:", diamondInit.address);

  // deploy facets
  console.log("");
  console.log("Deploying facets");
  const FacetNames = ["OwnershipFacet", "DiamondLoupeFacet", "DiamondToken"];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = cfx.Contract(getArtifacts(FacetName));
    const txReceipt = await Facet.constructor()
      .sendTransaction({ from: acct })
      .executed();
    console.log(`${FacetName} is deployed to ${txReceipt.contractCreated}`);

    cut.push({
      facetAddress: txReceipt.contractCreated,
      action: FacetCutAction.Add,
      functionSelectors: await getSelectors(FacetName),
    });
  }

  // upgrade diamond with facets
  console.log("");
  console.log("Diamond Cut:", cut);

  const DiamondCutFacet = cfx.Contract({
    abi: getAbi("DiamondCutFacet"),
    address: DiamondAddress,
  });
  let tx;
  //@ts-ignore
  tx = await DiamondCutFacet.diamondCut(
    cut,
    ethers.constants.AddressZero,
    "0x"
  ).sendTransaction({ from: acct });
  console.log("Diamond cut tx: ", tx);

  //mint some tokens by interacting with the diamond
  console.log("minting some tokens");
  const DMTFacet = cfx.Contract({
    abi: getAbi("DiamondToken"),
    address: DiamondAddress,
  });
  //@ts-ignore
  const mintTx = await DMTFacet.mint(
    acct.toString(),
    "1000000000000000000000"
  ).sendTransaction({ from: acct });
  console.log(`token mint txn hash ${mintTx}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
