import { z } from "zod";

export const useWalletBalanceSchema = z.object({
    body: z.object({
        amount: z.number().positive("Cannot forcefully debit negative limits structurally.").min(0.01)
    })
});
