const { createFilePath } = require(`gatsby-source-filesystem`);
const slugify = require("slugify");

exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;
  // Ensures we are processing only recipes
  if (node.internal.type === "recipe") {
    const relativeFilePath = createFilePath({
      node,
      getNode,
      basePath: "data/",
      trailingSlash: false,
    });
    // Creates new query'able field with name of 'slug'
    createNodeField({
      node,
      name: "slug",
      value: `${relativeFilePath.substring(
        0,
        relativeFilePath.lastIndexOf("/")
      )}/${slugify(node.title, { lower: true })}`,
    });
  }
};

exports.createPages = async ({ actions: { createPage }, graphql }) => {
  const results = await graphql(`
    {
      allRecipe {
        edges {
          node {
            fields {
              slug
            }
          }
        }
      }
    }
  `);

  results.data.allRecipe.edges.forEach((edge) => {
    const recipe = edge.node;

    createPage({
      path: recipe.fields.slug,
      component: require.resolve("./src/templates/Recipe.js"),
      context: {
        slug: recipe.fields.slug,
      },
    });
  });
};
