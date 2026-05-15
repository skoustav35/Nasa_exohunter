try {
    const minimatch = await import('minimatch');
    console.log('Successfully imported minimatch:', !!minimatch);
} catch (e) {
    console.error('Failed to import minimatch:', e);
}
