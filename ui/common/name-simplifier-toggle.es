import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { Button, Tooltip, Position } from '@blueprintjs/core'
import { createSelector } from 'reselect'
import { modifyObject, not } from 'subtender'

import { simplifyNamesSelector } from '../../selectors'
import { mapDispatchToProps } from '../../store'
import { PTyp } from '../../ptyp'
import { getI18n } from './i18n'

/*
   Toggles whether names are shown with traditional characters
   converted to simplified ones (see game-misc/t2s).
 */
@connect(
  createSelector(
    simplifyNamesSelector,
    enabled => ({enabled})
  ),
  mapDispatchToProps,
)
class NameSimplifierToggle extends PureComponent {
  static propTypes = {
    style: PTyp.object,
    enabled: PTyp.bool.isRequired,
    uiModify: PTyp.func.isRequired,
  }

  static defaultProps = {
    style: {},
  }

  handleToggle = () =>
    this.props.uiModify(
      modifyObject('simplifyNames', not)
    )

  render() {
    const {style, enabled} = this.props
    const {__} = getI18n()
    return (
      <span style={style} className="name-simplifier-toggle">
        <Tooltip
          content={__('SimplifyNamesTip')}
          position={Position.BOTTOM}
          hoverOpenDelay={300}
        >
          <Button
            small
            intent={enabled ? 'primary' : 'default'}
            onClick={this.handleToggle}
            text={__('SimplifyNames')}
          />
        </Tooltip>
      </span>
    )
  }
}

export { NameSimplifierToggle }
