exports.createPages = async ({ actions: { createPage }, graphql }) => {
  const results = await graphql(`
    {
      allRecipe {
        edges {
          node {
            slug
          }
        }
      }
    }
  `);

  results.data.allRecipe.edges.forEach(edge => {
    const recipe = edge.node;

    createPage({
      path: recipe.slug,
      component: require.resolve("./src/templates/Recipe.js"),
      context: {
        slug: recipe.slug
      }
    });
  });
};
