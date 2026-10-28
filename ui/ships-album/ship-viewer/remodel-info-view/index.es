import _ from 'lodash'
import { createStructuredSelector, createSelector } from 'reselect'
import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { H3, Classes } from '@blueprintjs/core'
import {
  mergeMapStateToProps,
} from 'subtender'
import {
  constSelector,
} from 'views/utils/selectors'

import {
  remodelInfoSelector,
  remodelDetailsSelector,
  nameSimplifierSelector,
} from '../../../../selectors'

import { PTyp } from '../../../../ptyp'
import { mapDispatchToProps } from '../../../../store'
import { InfoRow } from './info-row'

const prepareMstIdToDesc = ($ships, $shipTypes, simplify) => mstId => {
  const $ship = $ships[mstId]
  return {
    shipName: simplify($ship.api_name),
    typeName: simplify($shipTypes[$ship.api_stype].api_name),
  }
}

@connect(
  mergeMapStateToProps(
    createStructuredSelector({
      remodelDetails: remodelDetailsSelector,
      remodelInfo: remodelInfoSelector,
      simplify: nameSimplifierSelector,
    }),
    createSelector(
      constSelector,
      ({$ships,$shipTypes}) => ({$ships,$shipTypes})
    )
  ),
  mapDispatchToProps,
)
class RemodelInfoView extends PureComponent {
  static propTypes = {
    style: PTyp.object.isRequired,
    mstId: PTyp.number.isRequired,
    remodelDetails: PTyp.object.isRequired,
    remodelInfo: PTyp.object.isRequired,
    simplify: PTyp.func.isRequired,
    $ships: PTyp.object.isRequired,
    $shipTypes: PTyp.object.isRequired,
  }

  render() {
    const {
      style,
      mstId,
      remodelInfo, remodelDetails,
      $ships, $shipTypes, simplify,
    } = this.props
    const noRender = (<div style={{display: 'none'}} />)
    const {originMstIdOf, remodelChains} = remodelInfo
    const originMstId = originMstIdOf[mstId]
    if (! originMstId)
      return noRender
    const remodelChain = remodelChains[originMstId]
    if (! remodelChain)
      return noRender
    const currentRemodelDetails = _.flatMap(
      remodelChain,
      curMstId => {
        const detail = remodelDetails[curMstId]
        return detail ? [detail] : []
      })
    if (currentRemodelDetails.length === 0)
      return noRender
    const mstIdToDesc = prepareMstIdToDesc($ships, $shipTypes, simplify)
    const {__} = window.i18n["poi-plugin-navy-album"]
    return (
      <>
        <H3>
          <div>{__('ShipsTab.Remodels')}</div>
        </H3>
        <div
          className={Classes.LIST}
          style={{
            padding: '5px 10px',
            margin: 0,
            ...style,
          }}
        >
          {
            currentRemodelDetails.map(detail => {
              const key = detail.mstIdBefore
              const props = {
                style: {padding: '.4em .6em'},
                mstId, mstIdToDesc, detail, key,
              }
              return (<InfoRow {...props} />)
            })
          }
        </div>
      </>
    )
  }
}


export { RemodelInfoView }
