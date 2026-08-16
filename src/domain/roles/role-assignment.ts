export interface RoleAssignment {
  readonly playerId: string;

  readonly roleCode: string;

  readonly variantCode?: string;

  readonly targetPlayerIds?: readonly string[];

  readonly setupCompleted?: boolean;
}