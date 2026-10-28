/*
   debuffInfo is simply an Object
   whose keys are mstIds and values booleans.
   to indicate whether a "isBossDamaged" graph exists
 */
import { ACTION_PREFIX } from '../../plugin-meta'

const initState = {}

const reducer = (state = initState, action) => {
  if (action.type === `${ACTION_PREFIX}@debuffInfo@Modify`) {
    const {modifier} = action
    return modifier(state)
  }
  return state
}

export { reducer }
