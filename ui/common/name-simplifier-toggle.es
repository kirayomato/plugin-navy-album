import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { Button, Tooltip, Position } from '@blueprintjs/core'
import { createSelector } from 'reselect'
import { modifyObject, not } from 'subtender'

import { uiSelector } from '../../selectors'
import { mapDispatchToProps } from '../../store'
import { PTyp } from '../../ptyp'

/*
   Toggles whether names are shown with traditional characters
   converted to simplified ones (see game-misc/t2s).
 */
@connect(
  createSelector(
    uiSelector,
    ui => ({enabled: Boolean(ui && ui.simplifyNames)})
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
    const {__} = window.i18n["poi-plugin-navy-album"]
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
