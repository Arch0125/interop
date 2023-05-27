import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';
import { SLIP10Node } from '@metamask/key-tree';
import {ethers} from 'ethers';
import { getAbstractAccount } from './utils/initaccount';
import { SimpleAccountAPI } from '@account-abstraction/sdk';
import { Presets } from "userop";


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
      });}
    default:
      throw new Error('Method not found.');
  }
};
