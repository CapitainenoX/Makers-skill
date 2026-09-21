import React from "react";
import { Img, Loop, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import type { Media as MediaSpec, MediaRef } from "../deck";

const VIDEO_EXT = /\.(mp4|mov|webm|mkv|m4v|avi)$/i;

export const normalise = (m: MediaRef): MediaSpec =>
  typeof m === "string" ? { src: m } : m;

export const resolve = (src: string) =>
  src.startsWith("http") || src.startsWith("data:") ? src : staticFile(src);

export const isVideo = (m: MediaSpec) =>
  m.kind === "video" || (m.kind !== "image" && VIDEO_EXT.test(m.src));

/** One source, framed. Video is trimmed in frames and looped when the deck says how
 *  long the usable segment is — otherwise a 2 s clip under a 3 s scene freezes. */
export const Media: React.FC<{
  media: MediaRef;
  radius?: number;
  style?: React.CSSProperties;
}> = ({ media, radius = 0, style }) => {
  const { fps } = useVideoConfig();
  const m = normalise(media);
  const common: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: m.fit ?? "cover",
    display: "block",
    borderRadius: radius || undefined,
    ...style,
  };

  if (!isVideo(m)) {
    return <Img src={resolve(m.src)} style={common} />;
  }

  const speed = m.speed ?? 1;
  const trimBefore = m.in ? Math.round(m.in * fps) : undefined;
  const trimAfter = m.out ? Math.round(m.out * fps) : undefined;
  const video = (
    <OffthreadVideo
      src={resolve(m.src)}
      muted={m.mute !== false}
      playbackRate={speed}
      trimBefore={trimBefore}
      trimAfter={trimAfter}
      style={common}
    />
  );

  // Looping needs a known segment length; without `out` we cannot know one.
  const segment = m.out !== undefined ? (m.out - (m.in ?? 0)) / speed : null;
  if (m.loop === false || segment === null || segment <= 0) return video;
  // layout="none" is essential: Loop renders a Sequence, and a Sequence defaults to
  // absolute-fill, which would rip the video out of its device shell.
  return (
    <Loop durationInFrames={Math.max(1, Math.round(segment * fps))} layout="none">
      {video}
    </Loop>
  );
};
