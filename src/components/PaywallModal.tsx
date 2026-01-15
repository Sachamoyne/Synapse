"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "@/i18n";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: "free_plan" | "quota_exceeded";
  plan?: "starter" | "pro";
  used?: number;
  limit?: number;
  remaining?: number;
}

export function PaywallModal({
  open,
  onOpenChange,
  reason,
  plan,
  used,
  limit,
  remaining,
}: PaywallModalProps) {
  const { t } = useTranslation();

  const isFreePlan = reason === "free_plan";
  const isQuotaExceeded = reason === "quota_exceeded";
  const isStarter = plan === "starter";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isFreePlan
              ? "AI Generation Not Available"
              : "Monthly Quota Reached"}
          </DialogTitle>
          <DialogDescription>
            {isFreePlan ? (
              <div className="space-y-4">
                <p>
                  AI flashcard generation is not available on the free plan.
                </p>
                <p>
                  Upgrade to Starter (800 AI cards/month) or Pro (2,500 AI
                  cards/month) to unlock AI-powered flashcard generation.
                </p>
              </div>
            ) : isStarter ? (
              <div className="space-y-4">
                <p>
                  You've used all {limit} AI cards for this month. Your quota
                  will reset at the beginning of next month.
                </p>
                <p>
                  Upgrade to Pro for 2,500 AI cards per month and continue
                  generating cards immediately.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p>
                  You've used all {limit} AI cards for this month. Your quota
                  will reset at the beginning of next month.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          {isFreePlan ? (
            <>
              <Link href="/pricing" className="w-full">
                <Button className="w-full" onClick={() => onOpenChange(false)}>
                  View Plans
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Continue with Manual Creation
              </Button>
            </>
          ) : isStarter ? (
            <>
              <Link
                href="/api/checkout?plan=pro"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                <Button className="w-full">
                  {t("pricing.upgrade")}
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Continue with Manual Creation
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Continue with Manual Creation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
