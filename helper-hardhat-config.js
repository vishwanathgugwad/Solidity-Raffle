const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
        VRFCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entrenceFee: ethers.utils.parseEther("0.1"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "1839",
        callBackGasLimit: "500000",
        interval: "30",
    },
    31337: {
        name: "hardhat",
        entrenceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callBackGasLimit: "500000",
        interval: "30",
    },
}
const frontEndContractsFile = "../nextjs-smartcontract-lottery/constants/contractaddress.json"
const frontEndAbiFile = "../nextjs-smartcontract-lottery/constants/abi.json"

const developmentChains = ["hardhat", "localhost"]

module.exports = { developmentChains, networkConfig, frontEndAbiFile, frontEndContractsFile }
