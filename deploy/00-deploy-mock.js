const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config.js")

const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_PRICE_LINK = 1e9 // 1000000000

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (developmentChains.includes(network.name)) {
        log("local network detected ")
        //deploying a mock VRF2coordinator

        const args = [BASE_FEE, GAS_PRICE_LINK]

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
        })
        log("mocks deployed..")
        log("------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
