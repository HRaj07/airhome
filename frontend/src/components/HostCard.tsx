import Image from "next/image";
import { Award } from "lucide-react";
import type { User } from "@/lib/types";
import Badge from "./Badge";

export default function HostCard({ host }: { host: User }) {
  const joined = new Date(host.created_at).getFullYear();
  return (
    <div className="flex items-start gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        {host.avatar_url && <Image src={host.avatar_url} alt={host.full_name} fill sizes="56px" className="object-cover" />}
      </div>
      <div>
        <p className="flex items-center gap-2 font-semibold text-ink dark:text-neutral-100">
          Hosted by {host.full_name}
          {host.is_superhost && (
            <Badge tone="rausch">
              <Award size={12} /> Superhost
            </Badge>
          )}
        </p>
        <p className="text-sm text-hof dark:text-neutral-400">Joined in {joined}</p>
        {host.bio && <p className="mt-2 max-w-md text-sm text-ink dark:text-neutral-200">{host.bio}</p>}
      </div>
    </div>
  );
}
