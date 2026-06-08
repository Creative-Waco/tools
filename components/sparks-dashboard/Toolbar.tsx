import type { MembershipTypeFilter, Period } from "./types";

type ToolbarProps = {
  period: Period;
  membershipType: MembershipTypeFilter;
  refreshDisabled: boolean;
  onPeriodChange: (period: Period) => void;
  onMembershipTypeChange: (type: MembershipTypeFilter) => void;
  onRefresh: () => void;
  onExport: () => void;
};

export function Toolbar({
  period,
  membershipType,
  refreshDisabled,
  onPeriodChange,
  onMembershipTypeChange,
  onRefresh,
  onExport,
}: ToolbarProps) {
  return (
    <section className="toolbar panel">
      <div className="toolbar__filters">
        <label className="field field--inline">
          <span>Period</span>
          <select
            id="period"
            name="period"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as Period)}
          >
            <option value="fy">Fiscal year to date</option>
            <option value="quarter">This quarter</option>
            <option value="month">This month</option>
            <option value="year">Rolling 12 months</option>
          </select>
        </label>

        <label className="field field--inline">
          <span>Membership type</span>
          <select
            id="membership-type"
            name="membershipType"
            value={membershipType}
            onChange={(e) => onMembershipTypeChange(e.target.value as MembershipTypeFilter)}
          >
            <option value="all">All members</option>
            <option value="monthly">Monthly only</option>
            <option value="annual">Annual only</option>
          </select>
        </label>
      </div>

      <div className="toolbar__actions">
        <button type="button" className="ghost" id="export-btn" onClick={onExport}>
          Export snapshot
        </button>
        <button
          type="button"
          className="primary"
          id="refresh-btn"
          disabled={refreshDisabled}
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>
    </section>
  );
}
