export interface PowerAssignment {
    readonly playerId:
        string;

    readonly powerCode:
        string;

    readonly targetPlayerIds:
        readonly string[];

    readonly setupCompleted:
        boolean;

    readonly uses:
        number;
}