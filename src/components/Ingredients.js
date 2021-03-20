import React from "react";
import Image from "gatsby-image";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import LensIcon from "@material-ui/icons/Lens";
import CardContent from "@material-ui/core/CardContent";
import CardMedia from "@material-ui/core/CardMedia";

const Ingredients = ({ recipe }) => {
  const { image, title, ingredients } = recipe;
  return (
    <React.Fragment>
      {image ? (
        <CardMedia alt="Ingredients" height="140" title="Ingredients">
          <Image fluid={image.childImageSharp.fluid} alt={title} />
        </CardMedia>
      ) : (
        ""
      )}
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          Ingredienti
        </Typography>
        <List dense={true}>
          {ingredients
            ? ingredients.map((ingredient, index) => (
                <ListItem key={`ingredient-${index}`}>
                  <ListItemIcon>
                    <LensIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    className="ingredientQty"
                    primary={ingredient.name}
                    secondary={ingredient.qty}
                  />
                </ListItem>
              ))
            : ""}
        </List>
      </CardContent>
    </React.Fragment>
  );
};

export default Ingredients;
