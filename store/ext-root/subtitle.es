import { mkSimpleReducer } from './common'
import { ACTION_PREFIX } from '../../plugin-meta'

const initState = {}

const reducer = mkSimpleReducer(
  initState,
  `${ACTION_PREFIX}@subtitle@Modify`)

export { reducer }
