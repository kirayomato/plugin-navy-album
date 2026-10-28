import { ACTION_PREFIX } from '../../plugin-meta'

const initState = {
  ready: false,
  // activeTab: ships / equipments / game-update
  activeTab: 'ships',
  // when true, names (ship / equip / types) are shown with
  // traditional characters converted to simplified ones
  // (on by default; p-state-1.3.0 flips the old `false` default once)
  simplifyNames: true,
  // state for ShipsAlbum
  shipsAlbum: {
    // controls how the ship list appears
    listOptions: {
      // bool
      expanded: false,
      showSides: {
        friendly: true,
        abyssal: true,
      },
      groupShipTypes: true,
      // when true, ships who are remodeled from
      // the same ship is sorted close to each other in that order.
      groupRemodels: true,
    },
    shipViewer: {
      mstId: 185,
      level: 99,
      debuffFlag: false,
      quotesOptions: {
        showWedding: false,
        showSunk: false,
      },
      dockingCurrentHp: 1,
      activeTab: 'info',
    },
    searchText: '',
  },
  // state for EquipmentsAlbum
  equipmentsAlbum: {
    listOptions: {
      expanded: false,
      showSides: {
        friendly: true,
        abyssal: true,
      },
      groupEquipTypes: true,
    },
    equipViewer: {
      mstId: 128,
    },
    searchText: '',
  },
  musicLibrary: {
    activeTab: 'port', // 'port' or 'map'
    mapBgmViewer: {
      /*
         current focus of MapBgmViewer, could be:

         - {type: 'all'}
           for all known ids, sorted by id
         - {type: 'world', worldId: <world id>}
           for bgms of a specific world
         - {type: 'others'}
           for bgms not being mentioned anywhere in api_mst_bgm

       */
      focus: {type: 'all'},
    },
  },
}

const reducer = (state = initState, action) => {
  if (action.type === `${ACTION_PREFIX}@ui@Ready`) {
    const {newState} = action
    return {
      ...state,
      ...newState,
      ready: true,
    }
  }

  if (!state.ready)
    return state

  if (action.type === `${ACTION_PREFIX}@ui@Modify`) {
    const {modifier} = action
    return modifier(state)
  }
  return state
}

export { reducer }
