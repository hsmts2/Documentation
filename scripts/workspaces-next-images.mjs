import path from 'node:path';

export function isReviewedMonitoringImage(destination) {
  const folder = path.basename(path.dirname(destination));
  const name = path.basename(destination);
  return folder === 'workspaces-cost-optimizer' && /^(?:02[9]|03[0-7])-図\d+-/.test(name)
    || folder === 'workspaces-cloudwatch-monitoring' && /^(?:00[2-9]|01[0-9]|02[0-4])-/.test(name);
}
