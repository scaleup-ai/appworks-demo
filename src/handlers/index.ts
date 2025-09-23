export * from "./shared.handler";
export * from "../helpers/ui.helper";
export * from "./async.handler";

import * as uiHelpers from "../helpers/ui.helper";
import * as shared from "./shared.handler";
import * as asyncHelpers from "./async.handler";

const handlersDefault = {
  ...shared,
  ...uiHelpers,
  ...asyncHelpers,
};

export default handlersDefault;
