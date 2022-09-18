const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit test", () => {
          let raffle, vrfCoordinatorV2mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEnterenceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", () => {
              it("initializes the raffle constructor", async () => {
                  //ideally we make our tests have one assert per "it"
                  const raffleState = (await raffle.getRaffleState()).toString()
                  assert.equal(raffleState, "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enteRaffle", () => {
              it("Reverts when you dont pay enough ", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEntered"
                  )
              })
              it("records player when they enter", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const player = await raffle.getPlayer(0)
                  assert.equal(player, deployer)
              })

              it("emmits when enter", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("cannot enter if not open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  //we pretend to be a chainkeeper
                  await raffle.performUpkeep([])
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle_notOpen"
                  )
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people havent sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isnt open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
          })

          describe("perform Upkeep", () => {
              it("it can only run if checkupkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })

              it("revert if check upkeep is false", async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__upkeepnotneeded"
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("should only be call after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              it("should pick a winner, resets a lottery, and sends funds.", async () => {
                  const additionalEntrances = 3
                  const startingIndex = 1 // * 0 is deployer index.
                  const accounts = await ethers.getSigners()
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      const acccountConnectedRaffle = raffle.connect(accounts[i])
                      await acccountConnectedRaffle.enterRaffle({
                          value: raffleEntranceFee,
                      })
                  }
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Winner Picked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              // console.log(recentWinner);
                              // console.log(accounts[0].address);
                              // console.log(accounts[1].address);
                              // console.log(accounts[2].address);
                              // console.log(accounts[3].address);
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLastTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerEndingBalance = await accounts[1].getBalance()
                              // * Comparisons to check if our ending values are correct:
                              assert.equal(recentWinner.toString(), accounts[1].address)
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrances)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })
                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[1].getBalance()
                      // * pretend to be a Chainlink node that will call fulfillRandomWords.
                      // * this function will emit an event that we should listen for in tests before calling this. See above.
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      )
                      console.log("called")
                  })
              })
          })
      })
