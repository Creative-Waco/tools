import type { DashboardMember } from "./types";
import {
  formatDate,
  formatNumber,
  memberTierLabel,
  membershipTypeLabel,
} from "./utils";

type MembersTablesProps = {
  members: DashboardMember[];
  loading?: boolean;
};

function MemberNameCell({ member }: { member: DashboardMember }) {
  const name = member.displayName ?? "Member";
  if (!member.profileUrl) return <>{name}</>;
  return (
    <a
      href={member.profileUrl}
      className="member-profile-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      {name}
    </a>
  );
}

function handleMemberRowClick(
  event: React.MouseEvent<HTMLTableRowElement>,
  profileUrl?: string,
) {
  if (!profileUrl) return;
  if ((event.target as HTMLElement).closest("a")) return;
  window.open(profileUrl, "_blank", "noopener,noreferrer");
}

function skeletonTableRows(count: number, rowClass: string, colCount: number) {
  return Array.from({ length: count }, (_, i) => (
    <tr key={i} className={`skeleton-table-row ${rowClass}`}>
      {Array.from({ length: colCount }, (_, j) => (
        <td key={j}>
          <span className="skeleton skeleton--text-md" />
        </td>
      ))}
    </tr>
  ));
}

export function MembersTables({ members, loading }: MembersTablesProps) {
  const list = members ?? [];
  const paid = list.filter((m) => !m.isHonorary);
  const honorary = list.filter((m) => m.isHonorary);

  return (
    <>
      <section className="panel paid-members-panel panel--paid">
        <div className="panel-header panel-header--row">
          <div>
            <h2>Paid members</h2>
            <p className="panel-sub">Active Spark subscriptions · counts toward 90 goal</p>
          </div>
          <span id="paid-members-summary" className="pill pill--paid">
            {loading ? (
              <span className="skeleton skeleton--pill" style={{ width: "72px" }} />
            ) : (
              `${formatNumber(paid.length)} paid`
            )}
          </span>
        </div>
        <div className="table-wrap table-wrap--scroll table-wrap--compact-members">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Tier</th>
                <th scope="col">Type</th>
                <th scope="col">Member since</th>
              </tr>
            </thead>
            <tbody id="paid-members-body">
              {loading
                ? skeletonTableRows(6, "skeleton-members-row", 4)
                : paid.map((member) => (
                    <tr
                      key={`${member.displayName}-${member.memberSince}`}
                      className={`member-row--paid${member.profileUrl ? " member-row--link" : ""}`}
                      data-profile-url={member.profileUrl}
                      onClick={(e) => handleMemberRowClick(e, member.profileUrl)}
                    >
                      <td>
                        <MemberNameCell member={member} />
                      </td>
                      <td>
                        <span className={`tier-badge tier-badge--${member.tier}`}>
                          {memberTierLabel(member.tier)}
                        </span>
                      </td>
                      <td>{membershipTypeLabel(member.type)}</td>
                      <td>{formatDate(member.memberSince)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel honorary-members-panel panel--honorary">
        <div className="panel-header panel-header--row">
          <div>
            <h2>Honorary members</h2>
            <p className="panel-sub">Stewardship tier tags · tracked separately from paid goal</p>
          </div>
          <span id="honorary-members-summary" className="pill pill--honorary">
            {loading ? (
              <span className="skeleton skeleton--pill" style={{ width: "88px" }} />
            ) : (
              `${formatNumber(honorary.length)} honorary`
            )}
          </span>
        </div>
        <div className="table-wrap table-wrap--scroll table-wrap--compact-members">
          <table className="data-table data-table--honorary">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Tier</th>
                <th scope="col">Honorary since</th>
                <th scope="col">Expires</th>
              </tr>
            </thead>
            <tbody id="honorary-members-body">
              {loading
                ? skeletonTableRows(6, "skeleton-members-row", 4)
                : honorary.map((member) => (
                    <tr
                      key={`${member.displayName}-${member.honorarySince}`}
                      className={`member-row--honorary${member.profileUrl ? " member-row--link" : ""}`}
                      data-profile-url={member.profileUrl}
                      onClick={(e) => handleMemberRowClick(e, member.profileUrl)}
                    >
                      <td className="member-name--honorary">
                        <MemberNameCell member={member} />
                      </td>
                      <td>
                        <span
                          className={`tier-badge tier-badge--honorary tier-badge--honorary-${member.tier}`}
                        >
                          {memberTierLabel(member.tier)}
                        </span>
                      </td>
                      <td>{formatDate(member.honorarySince)}</td>
                      <td>{formatDate(member.honoraryExpires)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
