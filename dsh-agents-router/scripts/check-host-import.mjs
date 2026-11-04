try {
  await import('../src/index.js')
  console.log('Host entry and declared DSH peers resolve. This is not a live DSH host check.')
} catch (error) {
  console.error('Host entry import failed; this is a package-resolution check, not a live host check.')
  console.error(error)
  process.exitCode = 1
}
