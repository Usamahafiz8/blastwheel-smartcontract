module blastwheelz_nft_smart_contract::cars {
    use std::string::String;
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
        name: String,
        image_url: String,
        project_url: String,
        mint_number: u64,
        rim: String,
        texture: String,
        speed: u8,
        brake: u8,
        control: u8,
    }

    // Supply tracking for each car type
    public struct Supply<phantom T> has key, store {
        id: UID,
        max_supply: u64,
        minted: u64,
    }

    const EExceedsSupply: u64 = 0;
    const EInvalidSupply: u64 = 1;
    const EInvalidRating: u64 = 2;

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
        name: String,
        image_url: String,
        project_url: String,
        rim: String,
        texture: String,
        speed: u8,
        brake: u8,
        control: u8,
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(supply.minted < supply.max_supply, EExceedsSupply);
        assert!(speed >= 1 && speed <= 10, EInvalidRating);
        assert!(brake >= 1 && brake <= 10, EInvalidRating);
        assert!(control >= 1 && control <= 10, EInvalidRating);
        
        supply.minted = supply.minted + 1;
        let car = Car<T> {
            id: object::new(ctx),
            name,
            image_url,
            project_url,
            mint_number: supply.minted,
            rim,
            texture,
            speed,
            brake,
            control,
        };
        transfer::public_transfer(car, recipient);
    }

    // ========== Getter Functions for Car NFT ==========
    
    // Get car name
    public fun get_name<T>(car: &Car<T>): String {
        car.name
    }

    // Get car image URL
    public fun get_image_url<T>(car: &Car<T>): String {
        car.image_url
    }

    // Get car project URL
    public fun get_project_url<T>(car: &Car<T>): String {
        car.project_url
    }

    // Get mint number
    public fun mint_number<T>(car: &Car<T>): u64 {
        car.mint_number
    }

    // Get car rim
    public fun get_rim<T>(car: &Car<T>): String {
        car.rim
    }

    // Get car texture
    public fun get_texture<T>(car: &Car<T>): String {
        car.texture
    }

    // Get car speed rating
    public fun get_speed<T>(car: &Car<T>): u8 {
        car.speed
    }

    // Get car brake rating
    public fun get_brake<T>(car: &Car<T>): u8 {
        car.brake
    }

    // Get car control rating
    public fun get_control<T>(car: &Car<T>): u8 {
        car.control
    }

    // ========== Supply Functions ==========
    
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

    // Update car metadata - only the owner can update
    public fun update_car<T>(
        car: &mut Car<T>,
        new_name: String,
        new_image_url: String,
        new_project_url: String,
        new_rim: String,
        new_texture: String,
        new_speed: u8,
        new_brake: u8,
        new_control: u8,
    ) {
        assert!(new_speed >= 1 && new_speed <= 10, EInvalidRating);
        assert!(new_brake >= 1 && new_brake <= 10, EInvalidRating);
        assert!(new_control >= 1 && new_control <= 10, EInvalidRating);
        
        car.name = new_name;
        car.image_url = new_image_url;
        car.project_url = new_project_url;
        car.rim = new_rim;
        car.texture = new_texture;
        car.speed = new_speed;
        car.brake = new_brake;
        car.control = new_control;
    }
}
