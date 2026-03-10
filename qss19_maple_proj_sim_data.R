# QSS19 Maple Tree Project
# Maple Tree Simulated Data


###########
# FROM ZIG DIRECTLY...

# In sap from the field, we are seeing:
#   Lead - 0-130ppm
# Arsenic - 0-13ppm
# Cadmium - 0-13ppm
# Chromium - 0-12ppm
# Copper - 0-70ppm
# PFAS - 1.2-106ppt <--note that PFAS is measured in ppt, whereas metals are in ppm.
# 
# In soil from the field, we are seeing:
#   PFAS - 0-3ppt
# We don't yet have metals results, 
# but in our preliminary soil testing, we found lead in concentrations ranging from about 5-1500ppm.
# 
# I'm sure it goes without saying that these are rough numbers for internal
# use only, and shouldn't be shared beyond the class at this point...but maybe say that to the students just in case :) 
# 
# We had 10 sites, with 10 trees per site.  For each tree we collected three sap samples and a soil sample.
# 
# For now, I would classify sites as either Urban, Rural or Control.
# 
# Other data we collected included the species (Sugar, Red, 
# or Norway), diameter (~11-50in at breast height), height (~30-130ft), and crown width (~10-60ft) of each tree. 
# 
# For the lab experiments, we spiked the sap that started 
# out 1.8% BRIX with 100ppt PFAS, so we would expect to see ~3600ppt PFAS in the final syrup (66% BRIX), ceteris paribus.  What we will actually find is anyone's guess at this point.  I am actually not sure what concentration of lead our metals guy put in the spiking matrix... I can ask him. 
# 
# Is there anything else you can think of that would be helpful right now? 
########################


###################################

library(tidyverse)


# Right now these are uniform distributions because we do not 
# know the center or peakedness of the distributions. 
# I have a follow-up with Zig to find out whether these 
# variables have reliable means/measures of central tendency. 

mapledat <- data.frame(lead = runif(1000, 0, 130),
                       arsenic = runif(1000, 0, 13),
                       cadmium = runif(1000, 0,13),
                       chromium = runif(1000, 0,13),
                       copper = runif(1000, 0, 70),
                       pfas = runi(1000, 1.02, 106),
                       x = 1:1000)


# A VERY SIMPLE PLOT TO START. 

mapledat %>%
  ggplot(aes(x = x, y = lead)) +
  geom_point() +
  theme_minimal()














