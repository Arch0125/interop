import { ethers } from 'ethers';
import { SimpleAccountAPI } from '@account-abstraction/sdk';
import { Client, Presets } from 'userop';
import { divider, heading, panel, text } from '@metamask/snaps-ui';

const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const factoryAddress = '0x9406Cc6185a346906296840746125a0E44976454';
const paymasterAPI =
  'https://api.stackup.sh/v1/paymaster/09b0b15c992db3bc056c367840e10df3e816ea4a80a6a144d06d4e3f6a6547d1';
const rpcUrl =
  'https://api.stackup.sh/v1/node/09b0b15c992db3bc056c367840e10df3e816ea4a80a6a144d06d4e3f6a6547d1';

const paymasterconfig = {
  rpcUrl: paymasterAPI,
  context: { type: 'payg' },
};

const paymaster = Presets.Middleware.verifyingPaymaster(
  paymasterconfig.rpcUrl,
  paymasterconfig.context,
);

export const stackupbundler = async (
    target: string,
    value: string,
    data: string,
) => {
  const pvtkey = await await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'foo',
    },
  });

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pvtkey, provider);

  const simpleAccount = await Presets.Builder.SimpleAccount.init(
    new ethers.Wallet(pvtkey),
    rpcUrl,
    entryPoint,
    factoryAddress,
    paymaster,
  );

  const aa = simpleAccount;
  const client = await Client.init(rpcUrl,entryPoint)
  const nonce = await client.entryPoint.getNonce(aa.getSender(),0);

  const userop = await client.buildUserOperation(aa.execute(target, value, data));


  const confirm = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Transaction request'),
        divider(),
        text(`Do you want to send **${value}** to`),
        text(`Nonce : ${JSON.stringify(pvtkey)}`),
        text('The address :'),
        text(`**${target}**`),
      ]),
    },
  });

  if (confirm) {
    const res = await client.sendUserOperation(aa.execute(target, value, data));

    const ev = await res.wait();

    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Transaction sent'),
          divider(),
          text(`Transaction hash :`),
          text(`**${ev?.transactionHash}**`),
        ]),
      },
    });

    const txhash = ev?.transactionHash;
    return txhash;
  } else {
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
};
