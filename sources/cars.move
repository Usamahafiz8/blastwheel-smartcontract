module blastwheelz_nft_smart_contract::cars {
    use blastwheelz_nft_smart_contract::cap::AdminCap;

    // Car Types
    public struct HeBoomanator has drop {}
    public struct SuipremeSupra has drop {}
    public struct GoldenToiletGT has drop {}
    public struct FordFMBP1974 has drop {}
    public struct SuiverseRegera has drop {}
    public struct AquaGTR has drop {}
    public struct SkelSuiEnergyGT25 has drop {}
    public struct MercedesBuildersG550 has drop {}
    public struct ArkLiveCyberVenture has drop {}
    public struct AstonManni has drop {}
    public struct Juggernaut has drop {}
    public struct NightViper has drop {}
    public struct BlazeHowler has drop {}
    public struct CrimsonPhantom has drop {}
    public struct IronNomad has drop {}
    public struct NeonFang has drop {}
    public struct RedlineReaper has drop {}
    public struct BlueRupture has drop {}
    public struct VenomCircuit has drop {}
    public struct UltraPulse has drop {}
    public struct ScarletDominion has drop {}
    public struct SolarDrift has drop {}
    public struct AzureStrike has drop {}
    public struct BloodApex has drop {}
    public struct VelocityWarden has drop {}
    public struct ToxicSurge has drop {}
    public struct GoldenRevenant has drop {}
    public struct MidnightBrawler has drop {}
    public struct PhantomVector has drop {}
    public struct EmeraldHavoc has drop {}
    public struct HyperDune has drop {}
    public struct BlastFun has drop {}

    public struct Car<phantom T> has key, store {
        id: UID,
        mint_number: u64,
    }

    // Supply tracking for each car type
    public struct Supply<phantom T> has key, store {
        id: UID,
        max_supply: u64,
        minted: u64,
    }

    const EExceedsSupply: u64 = 0;
    const EInvalidSupply: u64 = 1;

    // Create supply for a car type
    #[allow(lint(self_transfer))]
    public fun create_supply<T>(
        _: &AdminCap,
        max_supply: u64,
        ctx: &mut TxContext
    ) {
        assert!(max_supply > 0, EInvalidSupply);
        let supply = Supply<T> {
            id: object::new(ctx),
            max_supply: max_supply,
            minted: 0,
        };
        transfer::public_transfer(supply, tx_context::sender(ctx));
    }

    // Update max supply (can only increase, and must be >= current minted)
    public fun update_supply<T>(
        _: &AdminCap,
        supply: &mut Supply<T>,
        new_max_supply: u64,
    ) {
        assert!(new_max_supply >= supply.minted, EInvalidSupply);
        supply.max_supply = new_max_supply;
    }

    // Mint with supply check
    public fun mint_and_transfer<T>(
        _: &AdminCap,
        supply: &mut Supply<T>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(supply.minted < supply.max_supply, EExceedsSupply);
        supply.minted = supply.minted + 1;
        let car = Car<T> {
            id: object::new(ctx),
            mint_number: supply.minted
        };
        transfer::public_transfer(car, recipient);
    }

    // Get mint number
    public fun mint_number<T>(car: &Car<T>): u64 {
        car.mint_number
    }

    // Get supply info
    public fun get_supply_info<T>(supply: &Supply<T>): (u64, u64) {
        (supply.minted, supply.max_supply)
    }

    // Get minted count
    public fun get_minted_count<T>(supply: &Supply<T>): u64 {
        supply.minted
    }

    // Get max supply
    public fun get_max_supply<T>(supply: &Supply<T>): u64 {
        supply.max_supply
    }
}
