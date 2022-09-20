// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// KeeperCompatible.sol imports the functions from both ./KeeperBase.sol and
// ./interfaces/KeeperCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "hardhat/console.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle_notOpen();
error Raffle__upkeepnotneeded(uint256 currentBalance, uint256 playernum, uint256 S_raffleState);

/**
 * @title A sample Raffle contract
 * @author Vishwanath Gugwad
 * @notice This contract is for creating untamperable decentralized smart contract
 * @dev This implements chainlink VRF v2 and chainlink keepers.
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* State Varirbles */
    // Chainlink VRF Variables

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionID;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callBackGasLimit;
    uint32 private constant NUMWORDS = 1;

    /* State Varirbles */
    address s_recentWinner;
    uint256 private immutable i_interval;
    uint256 private s_lastTimeStamp;
    RaffleState private S_raffleState;
    uint256 private immutable i_enteranceFee;
    address payable[] private s_players;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRandomWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player);

    /** Functions */
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionID,
        bytes32 gasLane,
        uint256 interval,
        uint256 enteranceFee,
        uint32 callBackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        S_raffleState = RaffleState.OPEN;
        i_gasLane = gasLane;
        i_subscriptionID = subscriptionID;
        i_enteranceFee = enteranceFee;
        i_callBackGasLimit = callBackGasLimit;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_enteranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (S_raffleState != RaffleState.OPEN) {
            revert Raffle_notOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__upkeepnotneeded(
                address(this).balance,
                s_players.length,
                uint256(S_raffleState)
            );
        }
        S_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // gaslane
            i_subscriptionID,
            REQUEST_CONFIRMATIONS,
            i_callBackGasLimit,
            NUMWORDS
        );
        emit RequestedRandomWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /*requistId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        S_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        virtual
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = RaffleState.OPEN == S_raffleState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    /** view //   pure functions  */
    function getEnterenceFee() public view returns (uint256) {
        return i_enteranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRaffleState() public view returns (RaffleState state) {
        state = S_raffleState;
    }

    function getNumberOfWords() public pure returns (uint256 NUM) {
        NUM = NUMWORDS;
    }

    function getNumberOfPlayers() public view returns (uint256 players) {
        players = s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256 lastTime) {
        lastTime = s_lastTimeStamp;
    }

    function getRequestConfirmation() public pure returns (uint16 requestConfirmations) {
        requestConfirmations = REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256 interval) {
        interval = i_interval;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }
}
