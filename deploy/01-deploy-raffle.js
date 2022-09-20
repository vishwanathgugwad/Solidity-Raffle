const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const FUND_AMOUNT = "1000000000000000000000"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionID, vrfCoordinatorV2Mock

    if (chainId == 31337) {
        log("Local network detected ..")
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionID = transactionReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionID, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["VRFCoordinatorV2"]
        subscriptionID = networkConfig[chainId]["subscriptionId"]
    }
    const entrenceFee = networkConfig[chainId]["entrenceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionID,
        gasLane,
        interval,
        entrenceFee,
        callBackGasLimit,
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: arguments,
        log: true,
        waitingConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("verifing ......")
        await verify(raffle.address, arguments)
    }
    log("----------------------------------------")
    log("Enter lottery with command:")
    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`)
    log("----------------------------------------------------")
}
module.exports.tags = ["all", "raffle"]
