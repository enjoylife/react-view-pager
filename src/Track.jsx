import React, { Component, Children, PropTypes, createElement } from 'react'
import ReactDOM, { findDOMNode } from 'react-dom'
import { Motion, spring, presets } from 'react-motion'
import Pager from './Pager'
import View from './View'
import getIndex from './get-index'

const TRANSFORM = require('get-prefix')('transform')

class TrackScroller extends Component {
  static contextTypes = {
    viewPager: PropTypes.instanceOf(Pager),
    setTrackPosition: PropTypes.func
  }

  state = {
    x: 0,
    y: 0
  }

  componentWillReceiveProps({ trackPosition }) {
    const { viewPager, setTrackPosition } = this.context

    // update view styles with current position tween
    // this method can get called hundreds of times, let's make sure to optimize as much as we can
    viewPager.setViewStyles(trackPosition)

    // get the x & y values to position the track
    this.setState(viewPager.getPositionValue(trackPosition))

    // update context with current trackPosition
    if (setTrackPosition && this.props.trackPosition !== trackPosition) {
      setTrackPosition((trackPosition / viewPager.getTrackSize(false)) * -1, trackPosition)
    }
  }

  _renderViews() {
    return (
      Children.map(this.props.children, child =>
        <View children={child}/>
      )
    )
  }

  render() {
    const { tag, trackPosition, ...restProps } = this.props
    const { x, y } = this.state
    const style = {
      ...restProps.style,
      [TRANSFORM]: `translate3d(${x}px, ${y}px, 0)`
    }

    return createElement(tag, {
      ...restProps,
      style
    }, this._renderViews())
  }
}

class Track extends Component {
  static propTypes = {
    springConfig: PropTypes.objectOf(PropTypes.number)
  }

  static defaultProps = {
    tag: 'div',
    springConfig: presets.noWobble
  }

  static contextTypes = {
    viewPager: PropTypes.instanceOf(Pager)
  }

  state = {
    instant: false
  }

  _currentTween = 0

  componentDidMount() {
    const { viewPager } = this.context

    // add track to pager
    viewPager.addTrack(findDOMNode(this))

    // refresh instantly to set first track position
    this._setValueInstantly(true, true)

    // set values instantly on respective events
    viewPager.on('hydrated', () => this._setValueInstantly(true, true))
    viewPager.on('swipeMove', () => this._setValueInstantly(true))
    viewPager.on('swipeEnd', () => this._setValueInstantly(false))

    // set initial view index and listen for any incoming view index changes
    this.setCurrentView(viewPager.options.currentView)

    // updateView event comes from Frame component props
    // this is a little weird, probably should handle this through context
    viewPager.on('updateView', index => {
      this.setCurrentView(index)
    })
  }

  setCurrentView(index) {
    this.context.viewPager.setCurrentView(0, getIndex(index, this.props.children))
  }

  componentWillReceiveProps({ instant }) {
    // update instant state from props
    if (this.props.instant !== instant) {
      this.setState({ instant })
    }
  }

  _setValueInstantly(instant, reset) {
    this.setState({ instant }, () => {
      if (reset) {
        this.setState({ instant: false })
      }
    })
  }

  _getTrackStyle() {
    let { trackPosition } = this.context.viewPager
    if (!this.state.instant) {
      trackPosition = spring(trackPosition, this.props.springConfig)
    }
    return { trackPosition }
  }

  _handleOnRest = () => {
    const { viewPager } = this.context
    if (viewPager.options.infinite && !this.state.instant) {
      // reset back to a normal index
      viewPager.resetViews()

      // set instant flag so we can prime track for next move
      this._setValueInstantly(true, true)
    }

    // fire event for prop callback on Frame component
    viewPager.emit('rest')
  }

  render() {
    const { viewPager } = this.context
    const { springConfig, ...restProps } = this.props
    return (
      <Motion
        style={this._getTrackStyle()}
        onRest={this._handleOnRest}
        >
        { ({ trackPosition }) =>
          createElement(TrackScroller, { trackPosition, ...restProps })
        }
      </Motion>
    )
  }
}

export default Track