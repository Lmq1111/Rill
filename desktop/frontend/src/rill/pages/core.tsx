import { Automation } from "../components/workbench/Automation";
import { Changes } from "../components/workbench/Changes";
import { ChannelDetail } from "../components/workbench/ChannelDetail";
import { ContextOverview } from "../components/workbench/ContextOverview";
import { Files } from "../components/workbench/Files";
import { History } from "../components/workbench/History";
import { Recycle } from "../components/workbench/Recycle";
import { Workbench } from "../components/workbench/Workbench";

export const CorePages = Object.freeze({
  workbench: Workbench,
  channel: ChannelDetail,
  history: History,
  recycle: Recycle,
  automation: Automation,
  context: ContextOverview,
  files: Files,
  changes: Changes,
});
