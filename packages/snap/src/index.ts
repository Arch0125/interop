import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';
import { SLIP10Node } from '@metamask/key-tree';
import {ethers} from 'ethers';
import { getAbstractAccount } from './utils/initaccount';
import { SimpleAccountAPI } from '@account-abstraction/sdk';
import { Client, Presets } from "userop";
import { stackupbundler } from './utils/stackupbundler';
import { pimlicopaymaster } from './utils/pimlicopaymaster';

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

      const res = await snap.request({
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

      if(res){
      return address;
      }else{
        return false;
      }
    }
    case 'sendtx':{

      const paymsterchoice = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'prompt',
          content: panel([
            heading('Choose Paymaster for Transaction'),
            text('1 StackUp'),
            text('2 Pimlico'),
            text('3 Pimlico ERC20 Paymaster'),
            divider(),
            text('For ERC20 paymaster you need to have USDC in your Smart Wallet')
          ]),
          placeholder: 'Choose 1, 2 or 3',
        },
      });

      const target = request.params.to;
      const value = request.params.value;
      const data = request.params.data;

      if(paymsterchoice == '1'){
      await stackupbundler(target,value,data);
      }else{
        await pimlicopaymaster(target,value,data);
      }
    }
    default:
      throw new Error('Method not found.');
  }
};
