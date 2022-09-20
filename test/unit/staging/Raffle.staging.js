const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging  test", () => {
          let raffle, raffleEntranceFee, raffleContract

          beforeEach(async () => {
              accounts = await ethers.getSigners() // could also do with getNamedAccounts
              //   deployer = accounts[0]
              player = accounts[0]
              raffleContract = await ethers.getContract("Raffle")
              raffle = raffleContract.connect(player) // Returns a new instance of the Raffle contract connected to player
              raffleEntranceFee = await raffle.getEnterenceFee()
              console.log(player.address)
              console.log(accounts[1])
          })

          describe("FullfillRandomwords", () => {
              it("works with live chainlink keepers and chainlink VRF , we got  a random winner", async () => {
                  //enter the raffle
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  console.log(startingTimeStamp)
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              console.log("winner picked event fired !!")
                              const getRecentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const endingTimeStamp = await raffle.getLastTimeStamp()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(getRecentWinner.toString(), accounts[0].address)
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(e)
                          }
                      })
                      console.log("Entering the raffle..")
                      await raffle.enterRaffle({ value: raffleEntranceFee })
                      const winnerStartingBalance = await accounts[0].getBalance()
                  })
              })
          })
      })
