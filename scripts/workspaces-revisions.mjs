// Publication-specific corrections: keep approved procedure prose, examples and commands intact.
export function reviseDocument(key, markdown) {
  let text = markdown.replace(/\r\n?/g, "\n");
  if (key === "costOptimizerReports") {
    text = text.replace(/^- \[ \] /gm, "- ");
  }
  if (key === "connectorBuild") text = text.replace(/\n\n/g, "\n");
  if (key === "workspacesOu") {
    text = text.replace("- Managed ADとAD Connectorがアクティブで、⑥のディレクトリ登録が完了していること。", "- OU作成・権限委任では、Managed ADがアクティブで、ドメイン参加済みの管理用EC2から管理できること。\n- ターゲットOU設定では、AD Connectorがアクティブで、⑥のディレクトリ登録が完了していること。");
    text = text.replace("## 構築作業", "## 構築作業\n\n> **情報：工程ごとに前提を確認する**\n>\n> OU作成と権限委任は、AD Connector作成前に管理用EC2から実施できます。④で同じOUとConnectorsへの委任を完了している場合は、設定内容を照合します。ターゲットOUの保存は、⑥でディレクトリを登録した後、新規WorkSpaceを作成する前に実施します。");
  }
  if (key === "workspacesBuild") {
    text = text.replace("2. ⑦で専用OUの作成・権限委任・ターゲットOU設定を完了します。管理にはドメイン参加済みの管理用EC2を使用できます。", "2. ④または⑦で準備した専用OUと権限委任を確認し、⑦でターゲットOU設定を完了します。未作成の場合は、ドメイン参加済みの管理用EC2からOUを作成します。");
  }
  if (key === "connectorDelegation") {
    text = text.replace(/[^\n]*根拠ではありません。[^\n]*/g, "画像の「パスワードを無期限にする」は、アカウント単位のPasswordNeverExpires設定です。PSOの適用状態は、別途Get-ADUserResultantPasswordPolicyで確認します。");
  }
  // References are attached to the relevant page sections, with detailed appendices retained.
  if (key === "costOptimizerDeploy" && !text.includes('/releases/tag/v2.9.10')) {
    text = text.replace('## 仕様', '## 仕様\n\n[ソースコード](https://github.com/aws-solutions/cost-optimizer-for-amazon-workspaces)／[v2.9.10のコード](https://github.com/aws-solutions/cost-optimizer-for-amazon-workspaces/tree/v2.9.10)／[v2.9.10のリリースノート](https://github.com/aws-solutions/cost-optimizer-for-amazon-workspaces/releases/tag/v2.9.10)／[リリース履歴](https://github.com/aws-solutions/cost-optimizer-for-amazon-workspaces/blob/v2.9.10/CHANGELOG.md)');
  }
  text = text.replace(/である(?=。|\*\*|\n|\s*\|)/g, "です");
  text = text.replaceAll("仕組みであり、", "仕組みです。");
  return text;
}
