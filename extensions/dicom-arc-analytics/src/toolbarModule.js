const TOOLBAR_BUTTON_TYPES = {
  COMMAND: 'command',
};

const definitions = [
  {
    id: 'ArcAnalytics',
    label: 'Arc Analytics',
    icon: 'eye',
    //
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'openDICOMArcAnalytics',
    context: 'VIEWER',
  },
];

export default {
  definitions,
  defaultContext: 'VIEWER',
};
