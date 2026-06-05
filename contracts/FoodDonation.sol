// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract FoodDonation {
    enum Status {
        Available,
        Claimed,
        Completed,
        Expired
    }

    struct Donation {
        uint256 id;
        address donor;
        string foodDetails;
        uint256 quantity;
        string pickupTime;
        string pickupLocation;
        uint256 createdAt;
        uint256 expiresAt;
        Status status;
        address claimer;
        uint256 claimedAt;
        uint256 completedAt;
    }

    address public immutable admin;
    uint256 public donationCount;

    mapping(uint256 => Donation) public donations;

    event DonationCreated(
        uint256 indexed donationId,
        address indexed donor,
        string foodDetails,
        uint256 quantity,
        string pickupTime,
        string pickupLocation,
        uint256 expiresAt
    );
    event DonationClaimed(uint256 indexed donationId, address indexed claimer);
    event PickupConfirmed(uint256 indexed donationId, address indexed claimer);
    event DonationModerated(uint256 indexed donationId, address indexed admin, string action);

    constructor() {
        admin = msg.sender;
    }

    modifier donationExists(uint256 donationId) {
        require(donationId > 0 && donationId <= donationCount, "Donation does not exist");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    function createDonation(
        string memory foodDetails,
        uint256 quantity,
        uint256 expiresAt
    ) external {
        _createDonation(foodDetails, quantity, "", "", expiresAt);
    }

    function createDonationDetailed(
        string memory foodDetails,
        uint256 quantity,
        string memory pickupTime,
        string memory pickupLocation,
        uint256 expiresAt
    ) external {
        _createDonation(foodDetails, quantity, pickupTime, pickupLocation, expiresAt);
    }

    function claimDonation(uint256 donationId) external donationExists(donationId) {
        Donation storage donation = donations[donationId];
        _markAsExpiredIfNeeded(donation);

        require(donation.status == Status.Available, "Donation is not available");
        require(msg.sender != donation.donor, "Donor cannot claim own donation");

        donation.status = Status.Claimed;
        donation.claimer = msg.sender;
        donation.claimedAt = block.timestamp;

        emit DonationClaimed(donationId, msg.sender);
    }

    function confirmPickup(uint256 donationId) external donationExists(donationId) {
        Donation storage donation = donations[donationId];

        require(donation.status == Status.Claimed, "Donation is not claimed");
        require(donation.claimer == msg.sender, "Only claimer can confirm pickup");

        donation.status = Status.Completed;
        donation.completedAt = block.timestamp;

        emit PickupConfirmed(donationId, msg.sender);
    }

    function closeExpiredDonation(uint256 donationId) external donationExists(donationId) {
        Donation storage donation = donations[donationId];
        require(_isExpired(donation), "Donation has not expired");
        _markAsExpiredIfNeeded(donation);
    }

    function adminCloseDonation(uint256 donationId) external donationExists(donationId) onlyAdmin {
        Donation storage donation = donations[donationId];
        Status resolvedStatus = _effectiveStatus(donation);

        require(resolvedStatus != Status.Completed, "Completed donation cannot be moderated");
        require(resolvedStatus != Status.Expired, "Donation is already closed");

        donation.status = Status.Expired;
        donation.claimer = address(0);
        donation.claimedAt = 0;

        emit DonationModerated(donationId, msg.sender, "Closed by admin");
    }

    function adminRestoreDonation(
        uint256 donationId,
        uint256 newExpiresAt
    ) external donationExists(donationId) onlyAdmin {
        Donation storage donation = donations[donationId];
        Status resolvedStatus = _effectiveStatus(donation);

        require(resolvedStatus == Status.Expired, "Only closed donations can be restored");
        require(newExpiresAt > block.timestamp, "New expiry time must be in the future");

        donation.status = Status.Available;
        donation.expiresAt = newExpiresAt;
        donation.claimer = address(0);
        donation.claimedAt = 0;

        emit DonationModerated(donationId, msg.sender, "Restored by admin");
    }

    function getDonation(
        uint256 donationId
    )
        external
        view
        donationExists(donationId)
        returns (
            uint256 id,
            address donor,
            string memory foodDetails,
            uint256 quantity,
            string memory pickupTime,
            string memory pickupLocation,
            uint256 createdAt,
            uint256 expiresAt,
            uint8 status,
            address claimer,
            uint256 claimedAt,
            uint256 completedAt
        )
    {
        Donation storage donation = donations[donationId];
        Status resolvedStatus = _effectiveStatus(donation);

        return (
            donation.id,
            donation.donor,
            donation.foodDetails,
            donation.quantity,
            donation.pickupTime,
            donation.pickupLocation,
            donation.createdAt,
            donation.expiresAt,
            uint8(resolvedStatus),
            donation.claimer,
            donation.claimedAt,
            donation.completedAt
        );
    }

    function getDashboardStats()
        external
        view
        returns (uint256 total, uint256 available, uint256 claimed, uint256 completed, uint256 expired)
    {
        total = donationCount;

        for (uint256 id = 1; id <= donationCount; id++) {
            Status status = _effectiveStatus(donations[id]);

            if (status == Status.Available) {
                available += 1;
            } else if (status == Status.Claimed) {
                claimed += 1;
            } else if (status == Status.Completed) {
                completed += 1;
            } else if (status == Status.Expired) {
                expired += 1;
            }
        }
    }

    function isAdmin(address account) external view returns (bool) {
        return account == admin;
    }

    function _createDonation(
        string memory foodDetails,
        uint256 quantity,
        string memory pickupTime,
        string memory pickupLocation,
        uint256 expiresAt
    ) internal {
        require(bytes(foodDetails).length > 0, "Food details are required");
        require(quantity > 0, "Quantity must be greater than zero");
        require(expiresAt > block.timestamp, "Expiry time must be in the future");

        donationCount += 1;

        donations[donationCount] = Donation({
            id: donationCount,
            donor: msg.sender,
            foodDetails: foodDetails,
            quantity: quantity,
            pickupTime: pickupTime,
            pickupLocation: pickupLocation,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            status: Status.Available,
            claimer: address(0),
            claimedAt: 0,
            completedAt: 0
        });

        emit DonationCreated(
            donationCount,
            msg.sender,
            foodDetails,
            quantity,
            pickupTime,
            pickupLocation,
            expiresAt
        );
    }

    function _effectiveStatus(Donation storage donation) internal view returns (Status) {
        if (_isExpired(donation)) {
            return Status.Expired;
        }

        return donation.status;
    }

    function _isExpired(Donation storage donation) internal view returns (bool) {
        return donation.status == Status.Available && block.timestamp >= donation.expiresAt;
    }

    function _markAsExpiredIfNeeded(Donation storage donation) internal {
        if (_isExpired(donation)) {
            donation.status = Status.Expired;
        }
    }
}
