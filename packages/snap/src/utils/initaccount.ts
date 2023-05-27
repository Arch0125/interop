import { ethers } from 'ethers';
import { SimpleAccountAPI } from '@account-abstraction/sdk';
import { Presets } from 'userop';

const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const factoryAddress = '0x9406Cc6185a346906296840746125a0E44976454';
const paymasterAPI =
  'https://api.stackup.sh/v1/paymaster/09b0b15c992db3bc056c367840e10df3e816ea4a80a6a144d06d4e3f6a6547d1';
const rpcUrl =
  'https://api.stackup.sh/v1/node/09b0b15c992db3bc056c367840e10df3e816ea4a80a6a144d06d4e3f6a6547d1';

  const paymasterconfig = {
    "rpcUrl": paymasterAPI,
    "context": { "type": "payg" }
  }

  const paymaster = Presets.Middleware.verifyingPaymaster(
      paymasterconfig.rpcUrl,
      paymasterconfig.context
    )

export const getAbstractAccount = async () => {

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
    paymaster
  );

  return simpleAccount;
};
