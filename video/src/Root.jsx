import { Composition } from 'remotion'
import { Movie } from './Video'
import { FULL, SHORT, totalSeconds } from './plan'
import { TEASER_FRAMES, Teaser } from './Teaser'

const FPS = 30
export const Root = () => (
  <>
    <Composition id="Tutorial" component={Movie} durationInFrames={Math.round(totalSeconds(FULL) * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{ plan: FULL, music: 'music-full.wav' }} />
    <Composition id="Trailer" component={Movie} durationInFrames={Math.round(totalSeconds(SHORT) * FPS)} fps={FPS} width={1920} height={1080} defaultProps={{ plan: SHORT, music: 'music-short.wav' }} />
    <Composition id="Spoiler" component={Teaser} durationInFrames={TEASER_FRAMES} fps={FPS} width={1080} height={1920} />
  </>
)
