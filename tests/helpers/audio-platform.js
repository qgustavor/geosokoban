// A deterministic audio clock exposes scheduling and cleanup without requiring an audio device in CI.
export function audioPlatform ({ state = 'suspended' } = {}) {
  const timers = new Map()
  const contexts = []
  let timerId = 0
  let rejectResume = false
  let deferredResume = false
  const resumeRequests = []

  function parameter () {
    return {
      value: 1,
      events: [],
      setValueAtTime (value, at) {
        this.value = value
        this.events.push(['set', value, at])
      },
      linearRampToValueAtTime (value, at) {
        this.events.push(['linear', value, at])
      },
      exponentialRampToValueAtTime (value, at) {
        this.events.push(['exponential', value, at])
      },
      cancelScheduledValues (at) {
        this.events.push(['cancel', at])
      },
      setTargetAtTime (value, at, timeConstant) {
        this.value = value
        this.events.push(['target', value, at, timeConstant])
      }
    }
  }

  function node () {
    return {
      connections: [],
      disconnected: false,
      connect (destination) {
        this.connections.push(destination)
      },
      disconnect () {
        this.disconnected = true
        this.connections = []
      }
    }
  }

  function createContext () {
    const listeners = new Set()
    const context = {
      currentTime: 0,
      state,
      destination: {},
      gains: [],
      oscillators: [],
      resumes: 0,
      suspends: 0,
      closes: 0,
      listeners,
      changeState (next) {
        this.state = next
        for (const callback of listeners) callback()
      },
      createGain () {
        const gain = { ...node(), gain: parameter() }
        this.gains.push(gain)
        return gain
      },
      createOscillator () {
        const oscillator = {
          ...node(),
          type: '',
          frequency: parameter(),
          onended: null,
          started: null,
          stops: [],
          start (at) {
            this.started = at
          },
          stop (at = context.currentTime) {
            this.stops.push(at)
          }
        }
        this.oscillators.push(oscillator)
        return oscillator
      },
      addEventListener (name, callback) {
        if (name === 'statechange') listeners.add(callback)
      },
      removeEventListener (name, callback) {
        listeners.delete(callback)
      },
      resume () {
        this.resumes++
        if (rejectResume) return Promise.reject(new Error('Autoplay denied'))

        if (deferredResume) {
          return new Promise(resolve => {
            resumeRequests.push(() => {
              this.changeState('running')
              resolve()
            })
          })
        }

        this.changeState('running')
        return Promise.resolve()
      },
      suspend () {
        this.suspends++
        this.changeState('suspended')
        return Promise.resolve()
      },
      close () {
        this.closes++
        this.changeState('closed')
        return Promise.resolve()
      }
    }
    contexts.push(context)
    return context
  }

  function advance (seconds) {
    for (const context of contexts) {
      context.currentTime += seconds
      for (const oscillator of context.oscillators) {
        if (oscillator.stops.at(-1) <= context.currentTime) oscillator.onended?.()
      }
    }

    for (const callback of [...timers.values()]) callback()
  }

  return {
    contexts,
    timers,
    createContext,
    schedule (callback) {
      timers.set(++timerId, callback)
      return timerId
    },
    clear (id) {
      timers.delete(id)
    },
    advance,
    rejectResume (value) {
      rejectResume = value
    },
    deferResume () {
      deferredResume = true
    },
    finishResume () {
      for (const resolve of resumeRequests.splice(0)) resolve()
    }
  }
}
