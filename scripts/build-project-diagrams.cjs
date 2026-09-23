// Public explanatory diagrams only. No customer topology or identifiers.
// Requires sharp: node scripts/build-project-diagrams.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const diagrams = [
  {
    id: 'linux-replacement', title: '01  /  OS REPLACEMENT', flow: true,
    nodes: [
      ['Existing environment', 'Amazon Linux 2', 'Web / application settings'],
      ['Replacement environment', 'Amazon Linux 2023', 'Apache + PHP-FPM'],
      ['Storage configuration', 'Amazon EFS / EBS', 'Mounts / ownership / access'],
      ['Operational checks', 'Zabbix / CloudWatch', 'Services / logs / monitoring'],
    ],
    groups: [['Environment scope', 'Development / staging / production'], ['Configuration scope', 'OS / middleware / SSH / sudoers'], ['Delivery', 'Build procedure / verification records']],
    note: 'Conceptual migration workflow. Not a production network topology.',
  },
  {
    id: 'web-platform', title: '02  /  WEB PLATFORM', flow: true,
    nodes: [
      ['Client access', 'HTTPS', 'Route 53 / ACM'],
      ['Load balancing', 'Application Load Balancer', 'TLS termination'],
      ['Web / application', 'Amazon EC2 / RHEL 9', 'Apache Event MPM + PHP-FPM'],
      ['Database', 'Amazon RDS', 'MySQL'],
    ],
    groups: [['Mail delivery', 'Amazon SES / DKIM / DMARC'], ['Monitoring & notification', 'CloudWatch / SNS / Zabbix'], ['Backup', 'AWS Backup']],
    note: 'Conceptual service relationships. AZ placement and resource counts are omitted.',
  },
  {
    id: 'private-network', title: '03  /  PRIVATE CONNECTIVITY', flow: true,
    nodes: [
      ['Client network', 'On-premises', 'File integration'],
      ['Private connectivity', 'Direct Connect / VGW', 'AWS-side route configuration'],
      ['Service access', 'Interface VPC Endpoint', 'AWS PrivateLink for S3'],
      ['Object storage', 'Amazon S3', 'Resource access control'],
    ],
    groups: [['Network controls', 'Routes / security groups'], ['Authorization', 'IAM / resource policies'], ['Validation & handover', 'Flow Logs / reachability / runbooks']],
    note: 'Logical access path. DNS details, intermediate components and identifiers are omitted.',
  },
  {
    id: 'vdi-operations', title: '04  /  VDI & OPERATIONS', flow: false,
    nodes: [
      ['Desktop infrastructure', 'Amazon WorkSpaces', 'Directory integration'],
      ['Directory / file services', 'AD Connector / FSx', 'Integration / file-share mounts'],
      ['Private networking', 'VPC Peering / DX', 'Multi-VPC routing'],
      ['Patch operations', 'Systems Manager', 'Patch Manager / maintenance'],
    ],
    groups: [['Separate improvement workstream', 'WorkSpaces Cost Optimizer'], ['Deployment', 'CloudFormation / existing templates'], ['Technical handover', 'Procedures / diagrams / verification']],
    note: 'Responsibility map across related projects. No network path or single topology is implied.',
  },
];

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, value, size = 16, color = '#202a35', weight = 400) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;

async function main() {
  const out = path.join(__dirname, '..', 'assets', 'project-cases');
  await fs.mkdir(out, { recursive: true });
  for (const diagram of diagrams) {
    let body = text(30, 38, diagram.title, 19, '#202a35', 700);
    body += text(30, 64, 'PUBLIC EXPLANATORY MODEL', 12, '#526170');
    diagram.nodes.forEach((node, index) => {
      const x = 30 + index * 265;
      const color = ['#086fad', '#087d72', '#7653a3', '#51677e'][index];
      body += `<rect x="${x}" y="94" width="225" height="120" rx="4" fill="#fff" stroke="#b9c8d3"/><rect x="${x}" y="94" width="225" height="5" fill="${color}"/>`;
      body += text(x + 13, 122, node[0], 13, '#526170');
      body += text(x + 13, 158, node[1], 15, color, 700);
      body += text(x + 13, 189, node[2], 12, '#334353');
      if (diagram.flow && index < 3) body += `<path d="M${x + 230} 155h26" stroke="#657789" stroke-width="2" marker-end="url(#arrow)"/>`;
    });
    diagram.groups.forEach((group, index) => {
      const x = 30 + index * 350;
      body += `<rect x="${x}" y="258" width="320" height="82" rx="4" fill="#f3f7f9" stroke="#b9c8d3" ${diagram.flow ? '' : 'stroke-dasharray="6 4"'}/>`;
      body += text(x + 14, 285, group[0], 14, '#202a35', 600);
      body += text(x + 14, 314, group[1], 12, '#526170');
    });
    body += text(30, 378, diagram.note, 13, '#526170');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="400" viewBox="0 0 1080 400"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#657789"/></marker></defs><rect width="1080" height="400" fill="#ffffff"/><g font-family="Segoe UI,Arial,sans-serif">${body}</g></svg>`;
    await sharp(Buffer.from(svg), { density: 144 }).png().toFile(path.join(out, `${diagram.id}.png`));
    console.log(`Built ${diagram.id}.png`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
