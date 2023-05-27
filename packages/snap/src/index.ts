import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';
import { SLIP10Node } from '@metamask/key-tree';
import {ethers} from 'ethers';
import { getAbstractAccount } from './utils/initaccount';
import { SimpleAccountAPI } from '@account-abstraction/sdk';
import { Client, Presets } from "userop";

const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const factoryAddress = '0x9406Cc6185a346906296840746125a0E44976454';
const paymasterAPI =
  'https://api.stackup.sh/v1/paymaster/09b0b15c992db3bc056c367840e10df3e816ea4a80a6a144d06d4e3f6a6547d1';
const rpcUrl =
  'https://api.stackup.sh/v1/node/09b0b15c992db3bc056c367840e10df3e816ea4a80a6a144d06d4e3f6a6547d1';


export const onRpcRequest: OnRpcRequestHandler = async({ origin, request }) => {
  switch (request.method) {
    case 'aainit':{
      const pvtkey = await await snap.request({
        method: 'snap_getEntropy',
        params: {
          version: 1,
          salt: 'foo',
        },
      });

      const aa = await getAbstractAccount();
      const address = aa.getSender()

      await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            heading('Connection request'),
            divider(),
            text(`Do you want to connect **${origin}**! with`),
            text('The Smart Account :'),
            text(`**${address}**`),
          ]),
        },
      });
      return address;
    }
    case 'sendtx':{
      const aa = await getAbstractAccount();
      const client = await Client.init(rpcUrl,entryPoint)

      const target = request.params.to;
      const value = request.params.value;
      const data = request.params.data;

      const confirm = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            heading('Transaction request'),
            divider(),
            text(`Do you want to send **${value}** to`),
            text('The address :'),
            text(`**${target}**`),
          ]),
        },
      });

      if(confirm){

      const res = await client.sendUserOperation(aa.execute(target, value,data));

      const ev = await res.wait();

      await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            heading('Transaction sent'),
            divider(),
            text(`Transaction hash :`),
            text(`**${ev.transactionHash}**`),
          ]),
        },
      });
      
      const txhash = ev.transactionHash;
      return txhash;
    }
      else{
        return snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              heading('Transaction cancelled'),
              divider(),
              text(`Transaction cancelled`),
            ]),
          },
        });
      }
    }
    default:
      throw new Error('Method not found.');
  }
};
