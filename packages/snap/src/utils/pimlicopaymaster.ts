import {
  SimpleAccountFactory__factory,
  EntryPoint__factory,
  SimpleAccount__factory,
  EntryPoint,
  UserOperationStruct,
} from '@account-abstraction/contracts';
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers';
import { BigNumber, Wallet, constants } from 'ethers';
import {
  arrayify,
  hexlify,
  getAddress,
  hexConcat,
  formatEther,
  parseEther,
} from 'ethers/lib/utils';
import { ERC20, ERC20__factory } from '@pimlico/erc20-paymaster';
import { getERC20Paymaster } from '@pimlico/erc20-paymaster';
import { panel, heading, divider, text } from '@metamask/snaps-ui';

export const pimlicopaymaster = async (
    target: string,
    value: string,
    data: string,
) => {
  const privateKey = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'foo',
    },
  });

  const apiKey = '03cbfafd-2752-4521-8cbc-f7ff3a10f861'; // replace with your Pimlico API key
  const chain = 'mumbai'; // find the list of supported chain names on the Pimlico docs page

  const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
  const SIMPLE_ACCOUNT_FACTORY_ADDRESS =
    '0x9406Cc6185a346906296840746125a0E44976454';

  const pimlicoEndpoint = `https://api.pimlico.io/v1/${chain}/rpc?apikey=${apiKey}`;

  const pimlicoProvider = new StaticJsonRpcProvider(pimlicoEndpoint);
  if (pimlicoProvider === undefined) {
    console.log(
      'Warning: no Pimlico API key provided, will attempt to bundle using `owner` wallet',
    );
  }

  const rpcUrl = `https://${chain}.rpc.thirdweb.com`;
  const rpcProvider = new StaticJsonRpcProvider(rpcUrl);

  const generateInitCode = async (provider: Provider, wallet: Wallet) => {
    const simpleAccountFactory = SimpleAccountFactory__factory.connect(
      SIMPLE_ACCOUNT_FACTORY_ADDRESS,
      provider,
    );
    const initCode = hexConcat([
      SIMPLE_ACCOUNT_FACTORY_ADDRESS,
      simpleAccountFactory.interface.encodeFunctionData('createAccount', [
        wallet.address,
        0,
      ]),
    ]);

    return initCode;
  };

  const calculateSenderAddress = async (
    entryPoint: EntryPoint,
    initCode: string,
  ) => {
    const senderAddress = await entryPoint.callStatic
      .getSenderAddress(initCode)
      .then(() => {
        throw new Error('Expected getSenderAddress() to revert');
      })
      .catch((e) => {
        const data = e.message.match(/0x6ca7b806([a-fA-F\d]*)/)?.[1];
        if (!data) {
          return Promise.reject(new Error('Failed to parse revert data'));
        }
        const addr = getAddress(`0x${data.slice(24, 64)}`);
        return Promise.resolve(addr);
      });

    return senderAddress;
  };

  const genereteDummyCallData = (
    target: string,
    value1: string,
    data1: string,
  ) => {

    const to = target;
    const value = value1;
    const data = data1;

    const simpleAccount = SimpleAccount__factory.connect(to, rpcProvider);
    const callData = simpleAccount.interface.encodeFunctionData('execute', [
      to,
      value,
      data,
    ]);

    return callData;
  };

  const generateUserOperation = async (
    senderAddress: string,
    nonce: number,
    initCode: string,
    callData: string,
    paymasterAndData: string,
  ) => {
    // FILL OUT THE REMAINING USEROPERATION VALUES
    const gasPrice = await rpcProvider.getGasPrice();

    const userOperation = {
      sender: senderAddress,
      nonce: hexlify(nonce),
      initCode,
      callData,
      callGasLimit: hexlify(100_000), // hardcode it for now at a high value
      verificationGasLimit: hexlify(1000_000), // hardcode it for now at a high value
      preVerificationGas: hexlify(50_000), // hardcode it for now at a high value
      maxFeePerGas: hexlify(gasPrice),
      maxPriorityFeePerGas: hexlify(gasPrice),
      paymasterAndData,
      signature: '0x',
    };

    return userOperation;
  };

  const signUserOperation = async (
    owner: Wallet,
    entryPoint: EntryPoint,
    userOperation: UserOperationStruct,
  ) => {
    // SIGN THE USEROPERATION
    const signature = await owner.signMessage(
      arrayify(await entryPoint.getUserOpHash(userOperation)),
    );

    userOperation.signature = signature;

    return userOperation;
  };

  const submitUserOperation = async (
    entryPoint: EntryPoint,
    userOperation: UserOperationStruct,
    owner: Wallet,
    pimlicoProvider?: StaticJsonRpcProvider,
  ) => {
    if (pimlicoProvider !== undefined) {
      const userOperationHash = await pimlicoProvider.send(
        'eth_sendUserOperation',
        [userOperation, ENTRY_POINT_ADDRESS],
      );
      console.log(`UserOperation submitted. Hash: ${userOperationHash}`);
      await waitForReceipts(pimlicoProvider, userOperationHash);
    } else {
      // ALTERNATIVE WITHOUT PIMLICO KEY: SUBMIT HANDLEOPS YOURSELF FROM OWNER ADDRESS (MAKE SURE IT IS FILLED WITH ENOUGH MATIC/ETH)
      const ownerBalance = await rpcProvider.getBalance(owner.address);
      // 0.1 MATIC
      if (ownerBalance < BigNumber.from('100000000000000000')) {
        throw new Error(
          `Not enough native tokens to submit UserOperation yourself. Either get a Pimlico API key or fill up owner address ${owner.address} with native tokens`,
        );
      }

      const handleOpsTx = await entryPoint.handleOps(
        [userOperation],
        owner.address,
      );
      const receipt = await handleOpsTx.wait();
      console.log(
        `Receipt found!\nTransaction hash: ${receipt.transactionHash}`,
      );
    }
  };

  const waitForReceipts = async (
    pimlicoProvider: StaticJsonRpcProvider,
    userOperationHash: string,
  ) => {
    // let's also wait for the userOperation to be included, by continually querying for the receipts
    console.log('Querying for receipts...');
    let receipt = null;
    while (receipt === null) {
      receipt = await pimlicoProvider.send('eth_getUserOperationReceipt', [
        userOperationHash,
      ]);
    }
    await snap.request({
        method: 'snap_dialog',
        params: {
            type: 'alert',
            content: panel([
                heading('Transaction Confimed'),
                divider(),
                text(`Transaction Hash: **${receipt.receipt.transactionHash}**`),
            ]),
        },
    });
  };

    // STEP 4: GET SENDER ADDRESS
    const owner = new Wallet(privateKey, rpcProvider);
    const entryPoint = EntryPoint__factory.connect(
      ENTRY_POINT_ADDRESS,
      rpcProvider,
    );
    const initCode = await generateInitCode(rpcProvider, owner);
    const senderAddress = await calculateSenderAddress(entryPoint, initCode);

    console.log('Counterfactual sender address:', senderAddress);

    await snap.request({
        method: 'snap_dialog',
        params: {
            type: 'alert',
            content: panel([
                heading('Transaction Details'),
                divider(),
                text(`To **${target}**`),
                text(`Value **${value}**`),
                text(`Data **${data}**`),
            ]),
        },
    });

    const erc20Paymaster = await getERC20Paymaster(rpcProvider, 'USDC');

    const nonce =await  entryPoint.getNonce(senderAddress,0)

    const dummyCallData = genereteDummyCallData(target, value, data);
    const unsignedSponsoredUserOperation = await generateUserOperation(
      senderAddress,
      Number(nonce),
      '0x',
      dummyCallData,
      '0x',
    );

    await erc20Paymaster.verifyTokenApproval(unsignedSponsoredUserOperation); // verify if enough USDC is approed to the paymaster

    const erc20PaymasterAndData = await erc20Paymaster.generatePaymasterAndData(
      unsignedSponsoredUserOperation,
    );
    unsignedSponsoredUserOperation.paymasterAndData = erc20PaymasterAndData;

    const sponsoredUserOperation = await signUserOperation(
      owner,
      entryPoint,
      unsignedSponsoredUserOperation,
    );

    await submitUserOperation(
      entryPoint,
      sponsoredUserOperation,
      owner,
      pimlicoProvider,
    );
};
