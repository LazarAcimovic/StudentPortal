using Microsoft.AspNetCore.Mvc;
using StudentPortal.Models.Entities;

namespace StudentPortal.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UserController : ControllerBase
    {
      
        [HttpGet]
        public IEnumerable<User> Get()
        {
            using (var context = new StudentPortalApiContext())
            {
                //da getujemo sve usere
                //return context.Users.ToList();

                //addujemo usera u bazu


                //get user by id
                return context.Users.Where(user => user.Id == 1).ToList();
            }
        }
    }
}
