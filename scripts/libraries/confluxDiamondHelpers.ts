import { Contract } from "ethers";
import { accessSync } from "fs";
import { artifacts, ethers } from "hardhat";
import { Conflux } from "js-conflux-sdk";

///CONFLUX RPCs
export const mainnet = " https://main.confluxrpc.com";
export const testnet = "https://test.confluxrpc.com";

export interface contractArtifacts {
  abi: object[];
  bytecode: string;
}

export function getArtifacts(contractName: string) {
  const abi: object[] = artifacts.readArtifactSync(contractName).abi;
  const bytecode: string = artifacts.readArtifactSync(contractName).bytecode;
  let out: contractArtifacts = { abi, bytecode };
  return out;
}

export function getAbi(contractname: string) {
  const abi: object[] = artifacts.readArtifactSync(contractname).abi;
  return abi;
}

export async function getSelectors(contractName: any) {
  // let selectors=[]
  const cObject = await ethers.getContractFactory(contractName);
  const sigs = Object.keys(cObject.interface.functions);

  const selectors = sigs.reduce((acc: any, val: string) => {
    if (val !== "init(bytes)") {
      acc.push(cObject.interface.getSighash(val));
    }
    return acc;
  }, []);
  // console.log(selectors);
  return selectors;
}
