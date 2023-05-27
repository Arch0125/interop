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

      return snap.request({
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
      break;
    }
    case 'sendtx':{
      const aa = await getAbstractAccount();
      const client = await Client.init(rpcUrl,entryPoint)

      const target = ethers.utils.getAddress('0x28a292f4dC182492F7E23CFda4354bff688f6ea8');
      const value = ethers.utils.parseEther('0.001');

      const res = await client.sendUserOperation(aa.execute(target, value,"0x"));

      const ev = await res.wait();

      return snap.request({
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
    }
    default:
      throw new Error('Method not found.');
  }
};
