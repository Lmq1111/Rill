import { Automation } from "../components/workbench/Automation";
import { Changes } from "../components/workbench/Changes";
import { ChannelDetail } from "../components/workbench/ChannelDetail";
import { ContextOverview } from "../components/workbench/ContextOverview";
import { Files } from "../components/workbench/Files";
import { History } from "../components/workbench/History";
import { Recycle } from "../components/workbench/Recycle";
import { Workbench } from "../components/workbench/Workbench";
import { Settings } from "../components/settings/Settings";

export const CorePages = Object.freeze({
  workbench: Workbench,
  channel: ChannelDetail,
  history: History,
  recycle: Recycle,
  automation: Automation,
  context: ContextOverview,
  files: Files,
  changes: Changes,
  "settings-general": Settings,
  "settings-model": Settings,
  "settings-bot": Settings,
  "settings-mcp": Settings,
  "settings-skills": Settings,
  "settings-subagents": Settings,
  "settings-plugins": Settings,
  "settings-memory": Settings,
  "settings-hooks": Settings,
  "settings-diagnostics": Settings,
  "settings-keyboard": Settings,
  "settings-permissions": Settings,
  "settings-sandbox": Settings,
  "settings-network": Settings,
  "settings-appearance": Settings,
  "settings-about-privacy": Settings,
});
