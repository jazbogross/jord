import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('shows only the publication navigation in the garden archive', async ({ page }) => {
  await page.goto('/');
  const publicationButtonBox = await page.getByRole('link', { name: 'Garden archive' }).boundingBox();

  await page.goto('/garden/');
  await page.getByRole('button', { name: 'ENTER' }).click();

  const archiveNavigation = page.getByRole('navigation', { name: 'Garden archive navigation' });
  const publicationButton = archiveNavigation.getByRole('link', { name: 'Publication' });
  await expect(publicationButton).toBeVisible();
  await expect(archiveNavigation.getByText('Garden archive')).toHaveCount(0);
  await expect(archiveNavigation.locator('.pageSwitchButton')).toHaveCount(1);
  expect(await publicationButton.boundingBox()).toEqual(publicationButtonBox);

  await page.goto('/');
  const gardenArchiveButton = page.getByRole('link', { name: 'Garden archive' });
  await expect(gardenArchiveButton).toHaveCSS('white-space', 'nowrap');
  const gardenArchiveLineCount = await gardenArchiveButton.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lineCount = range.getClientRects().length;
    range.detach();
    return lineCount;
  });
  expect(gardenArchiveLineCount).toBe(1);
});

test('lists the nine real publication texts without placeholders', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(251, 250, 246)');
  await expect(page.locator('.publicationTexture')).toHaveClass(/is-loaded/);
  await expect(page.locator('.publicationTexture')).toHaveCSS('opacity', '0.3');
  await expect(page.locator('.publicationTextureImage')).toHaveCSS('object-fit', 'cover');
  await expect(page.locator('[data-publication-link]')).toHaveCount(9);
  await expect(page.locator('.publicationIntro')).toBeVisible();
  await expect(page.locator('.publicationIntro')).toHaveCSS('font-family', /jost/i);
  await expect(page.locator('.publicationStickyTitle')).toHaveCount(0);
  await expect(page.locator('.publicationIndexMeta').first()).toHaveCSS('font-family', /jost/i);
  await expect(page.getByRole('button', { name: 'UDSIGT' })).toHaveCSS('font-family', /jost/i);
  await expect(page.locator('.publicationHeader h1')).toHaveCSS('font-family', /abc synt/i);
  await expect(page.locator('.publicationIndexTitle').first()).toHaveCSS('font-family', /abc synt/i);
  const indexTitleSize = await page.locator('.publicationIndexTitle').first().evaluate((element) => (
    Number.parseFloat(window.getComputedStyle(element).fontSize)
  ));
  expect(indexTitleSize).toBeLessThanOrEqual(52);
  await expect(page.getByRole('link', { name: /Ej fornavn/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /I nat er nattens vilje denne/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Guldsmedens Ly/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Conversation between Bonaventure and Monia/ })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Lorem ipsum');
});

test('reshuffles the publication texts on every reload', async ({ page }) => {
  await page.goto('/');
  const firstOrder = await page.locator('[data-publication-link]').evaluateAll((links) => (
    links.map((link) => link.dataset.publicationLink)
  ));

  await page.reload();
  const secondOrder = await page.locator('[data-publication-link]').evaluateAll((links) => (
    links.map((link) => link.dataset.publicationLink)
  ));

  expect(secondOrder).not.toEqual(firstOrder);
  expect(secondOrder.slice().sort()).toEqual(firstOrder.slice().sort());

  const articleOrder = await page.locator('[data-publication-text]').evaluateAll((texts) => (
    texts.map((text) => text.dataset.publicationText)
  ));
  expect(articleOrder).toEqual(secondOrder);
});

test('renders genre-specific reading structures', async ({ page }) => {
  await page.goto('/#guldsmedens-ly');

  const drama = page.locator('#guldsmedens-ly');
  await expect(drama).toHaveClass(/genre-drama/);
  await expect(page.locator('.publicationHeader')).toBeHidden();
  await expect(page.locator('.publicationIntro')).toBeHidden();
  await expect(page.locator('.publicationIndexList')).toBeHidden();
  await expect(page.getByRole('button', { name: 'UDSIGT' })).toBeVisible();
  await expect(drama.locator('.publicationTextMeta')).toHaveCount(0);
  await expect(drama.getByRole('heading', { name: 'Karakterer' })).toBeVisible();
  await expect(drama.getByRole('heading', { name: 'Karakterer' })).toHaveCSS('font-family', /jost/i);
  await expect(drama.locator('.publicationTextBody p').first()).toHaveCSS('font-family', /jost/i);
  await expect(drama.locator('.dramaDialogue')).not.toHaveCount(0);
  await expect(drama.locator('.dramaDialogue').first()).toHaveCSS('display', 'grid');
  await expect(drama.locator('.dramaSpeaker').first()).toContainText('Guldsmeden');
  await expect(drama.locator('.dramaSpeech').first()).toContainText('Hvor er det dejligt');

  const annotatedSpeaker = drama.locator('.dramaSpeaker--annotated').first();
  await expect(annotatedSpeaker.locator('.dramaSpeakerName')).not.toContainText('(');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toContainText('(');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('visibility', 'hidden');
  await expect(annotatedSpeaker.locator('.dramaSpeakerName')).toHaveCSS('border-bottom-width', '0px');
  const desktopMoodIndicator = await annotatedSpeaker.locator('.dramaSpeakerName').evaluate((element) => (
    window.getComputedStyle(element, '::after').content
  ));
  expect(desktopMoodIndicator).toBe('"()"');
  await annotatedSpeaker.hover();
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('visibility', 'visible');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('border-top', '1px solid rgb(0, 0, 0)');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('background-color', 'rgb(251, 250, 246)');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('background-image', 'none');

  const shortMoodNote = drama.getByText('(til guldsmeden)', { exact: true });
  const shortMoodNoteWidth = await shortMoodNote.evaluate((element) => element.getBoundingClientRect().width);
  expect(shortMoodNoteWidth).toBeLessThan(384);

  const characterTypeSizes = await drama.evaluate((article) => ({
    heading: window.getComputedStyle(article.querySelector('.dramaCharacters h3')).fontSize,
    character: window.getComputedStyle(article.querySelector('.dramaCharacters li')).fontSize,
    speaker: window.getComputedStyle(article.querySelector('.dramaSpeakerName')).fontSize,
    body: window.getComputedStyle(article.querySelector('.publicationTextBody')).fontSize,
  }));
  expect(characterTypeSizes.heading).toBe(characterTypeSizes.speaker);
  expect(characterTypeSizes.character).toBe(characterTypeSizes.body);
  await expect(drama.locator('.dramaCharacters h3')).toHaveCSS('text-transform', 'uppercase');

  const stageDirectionSpacing = await drama.locator('.publicationTextBody p:has(> em:only-child)').first().evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      top: Number.parseFloat(styles.marginTop),
      bottom: Number.parseFloat(styles.marginBottom),
    };
  });
  expect(stageDirectionSpacing.top).toBeGreaterThan(20);
  expect(stageDirectionSpacing.bottom).toBe(stageDirectionSpacing.top);

  const dramaDirectionSizes = await drama.evaluate((article) => ({
    speaker: window.getComputedStyle(article.querySelector('.dramaSpeakerName')).fontSize,
    standaloneDirection: window.getComputedStyle(article.querySelector('.publicationTextBody p > em:only-child')).fontSize,
    hoverDirection: window.getComputedStyle(article.querySelector('.dramaSpeakerNote')).fontSize,
  }));
  expect(dramaDirectionSizes.standaloneDirection).toBe(dramaDirectionSizes.speaker);
  expect(dramaDirectionSizes.hoverDirection).toBe(dramaDirectionSizes.speaker);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.publicationIndexHeading')).toHaveCSS('position', 'static');
  await expect(drama.locator('.dramaDialogue').first()).toHaveCSS('display', 'block');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('position', 'static');
  await expect(annotatedSpeaker.locator('.dramaSpeakerNote')).toHaveCSS('visibility', 'visible');
  await expect(annotatedSpeaker.locator('.dramaSpeakerName')).toHaveCSS('border-bottom-width', '0px');
  const mobileMoodIndicator = await annotatedSpeaker.locator('.dramaSpeakerName').evaluate((element) => (
    window.getComputedStyle(element, '::after').display
  ));
  expect(mobileMoodIndicator).toBe('none');
  await expect(drama.locator('.dramaCharacters li')).toHaveCount(3);

  const characterStyles = await drama.locator('.dramaCharacters').evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      borderTopWidth: styles.borderTopWidth,
      borderBottomWidth: styles.borderBottomWidth,
      listDisplay: window.getComputedStyle(element.querySelector('ul')).display,
    };
  });
  expect(characterStyles).toEqual({
    borderTopWidth: '0px',
    borderBottomWidth: '1px',
    listDisplay: 'block',
  });

  await page.getByRole('button', { name: 'UDSIGT' }).click();
  await expect(page.locator('.publicationIndexList')).toBeVisible();
  await expect(drama).toBeHidden();

  await page.goto('/#i-nat-er-nattens-vilje-denne');
  const poem = page.locator('#i-nat-er-nattens-vilje-denne');
  await expect(poem).toHaveClass(/genre-poem/);
  await expect(poem.locator('.publicationTextBody br')).not.toHaveCount(0);
});

test('uses the publication fonts and keeps conversation timestamps in their own column', async ({ page }) => {
  await page.goto('/#conversation-between-bonaventure-and-monia');

  const title = page.locator('#conversation-between-bonaventure-and-monia h2');
  const paragraph = page.locator('#conversation-between-bonaventure-and-monia .publicationTextBody p').nth(15);

  await expect(title).toHaveCSS('font-family', /abc synt/i);
  await expect(paragraph).toHaveCSS('font-family', /jost/i);
  await expect(paragraph).toHaveCSS('display', 'grid');

  const columns = await paragraph.evaluate((element) => window.getComputedStyle(element).gridTemplateColumns);
  expect(columns.split(' ')).toHaveLength(2);
});

test('uses rain for in-page links but not browser history navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  await page.getByRole('link', { name: /Guldsmedens Ly/ }).click();
  await expect(page.locator('.publicationRainLayer')).toBeVisible({ timeout: 1500 });

  const incomingTitleWord = page.locator('.publicationRainWord.is-raining-in').filter({ hasText: /^Guldsmedens$/ });
  await expect(incomingTitleWord).toHaveCount(1, { timeout: 5000 });
  const incomingCharactersHeading = page.locator('.publicationRainWord.is-raining-in').filter({ hasText: /^KARAKTERER$/ });
  await expect(incomingCharactersHeading).toHaveText('KARAKTERER');
  await expect(incomingCharactersHeading).toHaveCSS('text-transform', 'uppercase');
  await expect(page.locator('#guldsmedens-ly .publicationAudio')).toHaveCSS('opacity', '0');
  await expect(page.locator('#guldsmedens-ly .dramaCharacters')).toHaveCSS('border-bottom-color', 'rgba(0, 0, 0, 0)');
  await page.waitForTimeout(2050);

  const titleHandoffOffset = await page.evaluate(() => {
    const tokenText = document.querySelector('.publicationRainWord.is-raining-in')?.firstChild;
    const titleText = document.querySelector('#guldsmedens-ly .publicationTextHeader h2')?.firstChild;
    if (!tokenText || !titleText) {
      return null;
    }

    const tokenRange = document.createRange();
    tokenRange.selectNodeContents(tokenText);
    const tokenRect = tokenRange.getBoundingClientRect();
    tokenRange.detach();

    const titleRange = document.createRange();
    titleRange.setStart(titleText, 0);
    titleRange.setEnd(titleText, 'Guldsmedens'.length);
    const titleRect = titleRange.getBoundingClientRect();
    titleRange.detach();

    return {
      x: Math.abs(tokenRect.left - titleRect.left),
      y: Math.abs(tokenRect.top - titleRect.top),
    };
  });
  expect(titleHandoffOffset).not.toBeNull();
  expect(titleHandoffOffset.x).toBeLessThan(0.75);
  expect(titleHandoffOffset.y).toBeLessThan(0.75);

  await expect(page.locator('.publicationRainLayer')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#guldsmedens-ly')).toHaveClass(/is-active/);
  await expect(page.locator('#guldsmedens-ly .publicationAudio')).toHaveCSS('opacity', '1');
  await expect(page.locator('#guldsmedens-ly .dramaCharacters')).toHaveCSS('border-bottom-color', 'rgb(0, 0, 0)');

  await page.goBack();
  await expect(page.locator('.publicationRainLayer')).toHaveCount(0);
  await expect(page.locator('.publicationIndexList')).toBeVisible();
  await expect(page.locator('#guldsmedens-ly')).toBeHidden();
});
