module blastwheelz_nft_smart_contract::blastwheelz {
    use sui::package;
    use blastwheelz_nft_smart_contract::cap;

    public struct BLASTWHEELZ has drop {}

    fun init(otw: BLASTWHEELZ, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);
        let admin_cap = cap::new(ctx);

        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        let publisher = package::claim(BLASTWHEELZ {}, ctx);
        let admin_cap = cap::new(ctx);

        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
    }
}
