const { network, getNamedAccounts, deployments, ethers, run } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfV2CoordinatoAddress, subscriptionID
    const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

    if (developmentChains.includes(network.name)) {
        log("Local network detected ..")
        const vrfCoordinatorV2mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfV2CoordinatoAddress = vrfCoordinatorV2mock.address
        const transactionResponse = await vrfCoordinatorV2mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionID = transactionReceipt.events[0].args.subId
        await vrfCoordinatorV2mock.fundSubscription(subscriptionID, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfV2CoordinatoAddress = networkConfig[chainId]["VRFCoordinatorV2"]
        subscriptionID = networkConfig[chainId]["subscriptionId"]
    }
    const entrenceFee = networkConfig[chainId]["entrenceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    const args1 = [
        vrfV2CoordinatoAddress,
        entrenceFee,
        gasLane,
        subscriptionID,
        callBackGasLimit,
        interval,
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args1,
        log: true,
        waitingConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("verifing ......")
        await verify(raffle.address, args1)
    }
    log("----------------------------------------")
}
module.exports.tags = ["all", "raffle"]
