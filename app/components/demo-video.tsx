'use client';
import { useState } from 'react';
import { VIDEO_SRC, POSTER_SRC, CAPTIONS_SRC } from '@/lib/demo-content';
export function DemoVideo({ id = 'splitbrief-demo' }: { id?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="demo-video">
      <video
        id={id}
        aria-label="SplitBrief narrated product demo"
        width={1920}
        height={1080}
        controls
        playsInline
        preload="metadata"
        poster={POSTER_SRC}
        onError={() => setFailed(true)}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
        <track src={CAPTIONS_SRC} kind="captions" srcLang="en" label="English" />
        Your browser cannot play this video. <a href={VIDEO_SRC}>Download the narrated MP4</a>.
      </video>
      <figcaption>
        {failed ? (
          <span role="status">
            The video could not load. <a href={VIDEO_SRC}>Open or download the MP4</a>, or read the
            transcript below.
          </span>
        ) : (
          'English narration and captions. No wallet connection needed.'
        )}
      </figcaption>
    </figure>
  );
}
