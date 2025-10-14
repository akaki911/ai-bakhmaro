import type { FC } from "react";

import SecretsPage from "@/components/AIDeveloper/tabs/Secrets/SecretsPage";

type SecretsAdminPanelVariant = "page" | "panel";

interface SecretsAdminPanelProps {
  variant?: SecretsAdminPanelVariant;
}

export const SecretsAdminPanel: FC<SecretsAdminPanelProps> = ({ variant = "page" }) => {
  return <SecretsPage variant={variant} />;
};

export default SecretsAdminPanel;
